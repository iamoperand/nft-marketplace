const { network } = require("hardhat")

function sleep(timeInMs) {
    return new Promise((resolve) => setTimeout(resolve, timeInMs))
}

async function moveBlocks(amount, sleepTimeInMs = 0) {
    console.log("Moving blocks...")

    for (let index = 0; index < amount; index++) {
        await network.provider.request({
            method: "evm_mine",
            params: [],
        })

        if (sleepTimeInMs) {
            console.log(`Sleeping for ${sleepTimeInMs}ms`)
            await sleep(sleepTimeInMs)
        }
    }
}

module.exports = {
    moveBlocks,
    sleep,
}
