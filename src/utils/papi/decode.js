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
  const callType = extrinsicDefinition.params.find(
    ({ name }) => name === "Call",
  ).type;

  return {
    eventRecordType: eventsStorage.type.value,
    callType,
    extrinsicType: metadata.extrinsic.type,
  };
}

function buildDecoders(metadataHex) {
  const metadata = unifyMetadata(decAnyMetadata(metadataHex));
  const dynamicBuilder = getDynamicBuilder(getLookupFn(metadata));
  const { eventRecordType, callType, extrinsicType } =
    getRuntimeTypeIds(metadata);

  return {
    eventsCodec: dynamicBuilder.buildDefinition(eventRecordType),
    callCodec: dynamicBuilder.buildDefinition(callType),
    extrinsicCodec: dynamicBuilder.buildDefinition(extrinsicType),
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

function getSignedExtrinsicCall(extrinsic) {
  if (extrinsic.call) return extrinsic.call;
  return extrinsic.value?.call || {};
}

function decodeExtrinsic(rawExtrinsic, decoders) {
  const body = getExtrinsicBody(rawExtrinsic);
  if (body.length === 0) return null;

  const format = extrinsicFormat.dec(body);
  if (format.type === "signed") {
    return getSignedExtrinsicCall(decoders.extrinsicCodec.dec(body));
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
