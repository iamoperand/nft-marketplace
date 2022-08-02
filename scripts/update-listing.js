const { ethers, network } = require("hardhat")
const { moveBlocks } = require("../utils/move-blocks")

const TOKEN_ID = 2
const NEW_PRICE_DIFF = ethers.utils.parseEther("1")

async function updateListing() {
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    const basicNft = await ethers.getContract("BasicNft")

    const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
    const newPrice = listing.price.add(NEW_PRICE_DIFF).toString()

    console.log("Updating Listing...")
    const updateListingTx = await nftMarketplace.updateListing(basicNft.address, TOKEN_ID, newPrice)
    await updateListingTx.wait(1)
    console.log("Updated Listing!")

    if (network.config.chainId == "31337") {
        await moveBlocks(2, 1000)
    }
}

updateListing()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
