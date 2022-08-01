const { ethers, network } = require("hardhat")
const fs = require("fs")
const { FRONTEND_CONTRACTS_FILE } = require("../helper-hardhat-config")

module.exports = async function () {
    if (process.env.UPDATE_FRONTEND) {
        console.log("Updating frontend...")
        await updateContractAddresses()
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

module.exports.tags = ["all", "frontend"]
