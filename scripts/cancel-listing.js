const { ethers, network } = require("hardhat")
const { moveBlocks } = require("../utils/move-blocks")

const TOKEN_ID = 0

async function cancelListing() {
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    const basicNft = await ethers.getContract("BasicNft")

    console.log("Cancelling Listing...")
    const cancelListingTx = await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
    await cancelListingTx.wait(1)
    console.log("Cancelled!")

    if (network.config.chainId == "31337") {
        await moveBlocks(2, 1000)
    }
}

cancelListing()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
