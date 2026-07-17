const {
  Binary,
  compactNumber,
  decAnyMetadata,
  extrinsicFormat,
  unifyMetadata,
} = require("@polkadot-api/substrate-bindings");
const {
  getDynamicBuilder,
  getLookupFn,
} = require("@polkadot-api/metadata-builders");

function getExtrinsicBody(rawExtrinsic) {
  const bytes = Binary.fromHex(rawExtrinsic);
  const encodedLength = compactNumber.enc(Number(compactNumber.dec(bytes)));
  return bytes.slice(encodedLength.length);
}

function getRuntimeTypeIds(metadata) {
  const system = metadata.pallets.find(({ name }) => name === "System");
  const eventsStorage = system.storage.items.find(
    ({ name }) => name === "Events",
  );
  const extrinsicDefinition = metadata.lookup[metadata.extrinsic.type];
  const getExtrinsicParameterType = (name) => {
    return extrinsicDefinition.params.find((param) => param.name === name).type;
  };

  return {
    eventRecordType: eventsStorage.type.value,
    callType: getExtrinsicParameterType("Call"),
    addressType: getExtrinsicParameterType("Address"),
    signatureType: getExtrinsicParameterType("Signature"),
  };
}

function buildDecoders(metadataHex) {
  const metadata = unifyMetadata(decAnyMetadata(metadataHex));
  const dynamicBuilder = getDynamicBuilder(getLookupFn(metadata));
  const { eventRecordType, callType, addressType, signatureType } =
    getRuntimeTypeIds(metadata);

  return {
    eventsCodec: dynamicBuilder.buildDefinition(eventRecordType),
    callCodec: dynamicBuilder.buildDefinition(callType),
    addressCodec: dynamicBuilder.buildDefinition(addressType),
    signatureCodec: dynamicBuilder.buildDefinition(signatureType),
    signedExtensionCodecs: Object.fromEntries(
      Object.entries(metadata.extrinsic.signedExtensions).map(
        ([version, extensions]) => [
          version,
          extensions.map(({ type }) => dynamicBuilder.buildDefinition(type)),
        ],
      ),
    ),
  };
}

function getCallParts(call) {
  const innerCall = call.value || {};
  return {
    pallet: call.type || "?",
    name: innerCall.type || "?",
    args: innerCall.value || innerCall,
  };
}

function consumeCodec(bytes, codec) {
  const value = codec.dec(bytes);
  return bytes.slice(codec.enc(value).length);
}

function decodeSignedExtrinsicCall(body, version, decoders) {
  const signedExtensionCodecs =
    decoders.signedExtensionCodecs[version] ||
    decoders.signedExtensionCodecs[0] ||
    [];
  let remaining = body.slice(1);

  for (const codec of [
    decoders.addressCodec,
    decoders.signatureCodec,
    ...signedExtensionCodecs,
  ]) {
    remaining = consumeCodec(remaining, codec);
  }

  return decoders.callCodec.dec(remaining);
}

function decodeExtrinsic(rawExtrinsic, decoders) {
  const body = getExtrinsicBody(rawExtrinsic);
  if (body.length === 0) return null;

  const format = extrinsicFormat.dec(body);
  if (format.type === "signed") {
    return decodeSignedExtrinsicCall(body, format.version, decoders);
  }

  return decoders.callCodec.dec(body.slice(1));
}

function getBlockExtrinsics(block) {
  if (block.block.block?.extrinsics) return block.block.block.extrinsics;
  return block.block?.extrinsics || [];
}

function decodeEvents(eventsHex, eventsCodec) {
  return eventsCodec.dec(Binary.fromHex(eventsHex)).map((record) => {
    return getCallParts(record.event || {});
  });
}

function decodeExtrinsics(rawExtrinsics, decoders) {
  return rawExtrinsics.map((rawExtrinsic) => {
    try {
      const call = decodeExtrinsic(rawExtrinsic, decoders);
      if (!call) return { empty: true };
      return getCallParts(call);
    } catch (error) {
      return { error: error.message };
    }
  });
}

function decodeBlockData(block, metadataHex) {
  const decoders = buildDecoders(metadataHex);
  const extrinsics = getBlockExtrinsics(block);

  return {
    events: decodeEvents(block.events, decoders.eventsCodec),
    extrinsics: decodeExtrinsics(extrinsics, decoders),
  };
}

module.exports = {
  decodeBlockData,
};
