const { ethers, network } = require("hardhat")
const { verify } = require("../utils/verify")
const { developmentChains } = require("../helper-hardhat-config")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const args = []
    const basicNft = await deploy("BasicNft", {
        from: deployer,
        args,
        logs: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log(`"BasicNft" contract deployed at ${basicNft.address}`)

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(basicNft.address, args)
    }

    log("----------------------------------------------------")
}

module.exports.tags = ["all", "basicnft"]
