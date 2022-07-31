const { ethers, network } = require("hardhat")
const { verify } = require("../utils/verify")
const { developmentChains } = require("../helper-hardhat-config")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const args = []
    const nftMarketplace = await deploy("NftMarketplace", {
        from: deployer,
        args,
        logs: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log(`"NftMarketplace" contract deployed at ${nftMarketplace.address}`)

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(nftMarketplace.address, args)
    }

    log("----------------------------------------------------")
}

module.exports.tags = ["all", "nftmarketplace"]
