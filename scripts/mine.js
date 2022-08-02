const { ethers, network } = require("hardhat")
const { moveBlocks } = require("../utils/move-blocks")

const BLOCKS = 2
const SLEEP_TIME_IN_MS = 1000

async function mine() {
    await moveBlocks(BLOCKS, SLEEP_TIME_IN_MS)
}

mine()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
