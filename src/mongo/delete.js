const { getBlockCollection } = require('./col')

async function deleteFromHeight(startHeight) {
  const col = await getBlockCollection()
  await col.deleteMany({
    height: {
      $gte: startHeight
    }
  })
}

module.exports = {
  deleteFromHeight
}
