const { ethers, network } = require("hardhat")
const fs = require("fs")
const { FRONTEND_CONTRACTS_FILE, FRONTEND_ABI_LOCATION } = require("../helper-hardhat-config")

module.exports = async function () {
    if (process.env.UPDATE_FRONTEND) {
        console.log("Updating frontend...")
        await updateContractAddresses()
        await updateAbi()
        console.log("Frontend updated!")
    }
}

async function updateContractAddresses() {
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    const chainId = network.config.chainId.toString()
    const contractAddresses = JSON.parse(fs.readFileSync(FRONTEND_CONTRACTS_FILE, "utf-8"))

    if (chainId in contractAddresses) {
        if (!contractAddresses[chainId]["NftMarketplace"].includes(nftMarketplace.address)) {
            contractAddresses[chainId]["NftMarketplace"].push(nftMarketplace.address)
        }
    } else {
        contractAddresses[chainId] = { NftMarketplace: [nftMarketplace.address] }
    }
    fs.writeFileSync(FRONTEND_CONTRACTS_FILE, JSON.stringify(contractAddresses))
}

async function updateAbi() {
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    fs.writeFileSync(
        `${FRONTEND_ABI_LOCATION}/NftMarketplace.json`,
        nftMarketplace.interface.format(ethers.utils.FormatTypes.json)
    )

    const basicNft = await ethers.getContract("BasicNft")
    fs.writeFileSync(
        `${FRONTEND_ABI_LOCATION}/BasicNft.json`,
        basicNft.interface.format(ethers.utils.FormatTypes.json)
    )
}

module.exports.tags = ["all", "frontend"]
