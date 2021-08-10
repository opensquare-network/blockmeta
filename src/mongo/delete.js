const { getBlockCollection, getVersionCollection } = require('./col')

async function deleteFromHeight(startHeight) {
  const col = await getBlockCollection()
  await col.deleteMany({
    height: {
      $gte: startHeight
    }
  })

  const versionCol = await getVersionCollection();
  await versionCol.deleteMany({
    height: {
      $gte: startHeight
    }
  })
}

module.exports = {
  deleteFromHeight
}
