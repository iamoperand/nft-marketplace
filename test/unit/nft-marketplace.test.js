const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Nft Marketplace Unit Tests", function () {
          let nftMarketplaceContract, nftMarketplace, basicNftContract, basicNft, deployer, user
          const PRICE = ethers.utils.parseEther("0.1")
          const TOKEN_ID = 0

          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              user = accounts[1]

              await deployments.fixture(["all"])
              nftMarketplaceContract = await ethers.getContract("NftMarketplace")
              nftMarketplace = nftMarketplaceContract.connect(deployer)
              basicNftContract = await ethers.getContract("BasicNft")
              basicNft = basicNftContract.connect(deployer)

              await basicNft.mintNft()
              await basicNft.approve(nftMarketplaceContract.address, TOKEN_ID)
          })

          describe("listItem", () => {
              it("Reverts in case already listed", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)

                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith(
                      `NftMarketplace__AlreadyListed("${basicNft.address}", ${TOKEN_ID})`
                  )
              })

              it("Reverts in case not the NFT owner", async () => {
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  await basicNft.approve(nftMarketplace.address, TOKEN_ID)

                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__NotOwner")
              })

              it("Reverts in case not approved", async () => {
                  await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID)
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace")
              })

              it("Emits an event after listing an item", async () => {
                  expect(await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.emit(
                      "ItemListed"
                  )
              })

              it("Updates listing with seller and price", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                  assert(listing.price.toString() == PRICE.toString())
                  assert(listing.seller.toString() == deployer.address)
              })
          })

          describe("buyItem", () => {
              it("Reverts if the item isn't listed", async () => {
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith("NftMarketplace__NotListed")
              })

              it("Reverts if the price isn't met", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith("NftMarketplace__PriceNotMet")
              })

              it("Transfers the NFT to the buyer and updates internal proceeds", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)

                  nftMarketplace = nftMarketplaceContract.connect(user)
                  expect(
                      await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                  ).to.emit("ItemBought")

                  const newOwner = await basicNft.ownerOf(TOKEN_ID)
                  const deployerProceeds = await nftMarketplace.getProceeds(deployer.address)
                  assert(newOwner.toString(), user.address)
                  assert(deployerProceeds.toString(), PRICE.toString())
              })
          })

          describe("cancelListing", () => {
              it("Reverts if there is no listing", async () => {
                  await expect(
                      nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith(`NotListed("${basicNft.address}", ${TOKEN_ID})`)
              })

              it("Reverts if anyone but the owner tries to call", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  await basicNft.approve(nftMarketplace.address, TOKEN_ID)
                  await expect(
                      nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith("NftMarketplace__NotOwner")
              })

              it("Emits event and removes listing", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  expect(await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)).to.emit(
                      "ItemCancelled"
                  )
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                  assert(listing.price.toString() == "0")
              })
          })

          describe("updateListing", function () {
              it("Reverts if not already listed", async () => {
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__NotListed")
              })

              it("Reverts if not the owner", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__NotOwner")
              })

              it("Updates the price of the item", async function () {
                  const updatedPrice = ethers.utils.parseEther("0.2")
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  expect(
                      await nftMarketplace.updateListing(basicNft.address, TOKEN_ID, updatedPrice)
                  ).to.emit("ItemListed")
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                  assert(listing.price.toString() == updatedPrice.toString())
              })
          })

          describe("withdrawProceeds", function () {
              it("Reverts if there are no proceeds", async function () {
                  await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWith("NoProceeds")
              })

              it("Withdraws proceeds", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  nftMarketplace = nftMarketplaceContract.connect(user)
                  await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
                  nftMarketplace = nftMarketplaceContract.connect(deployer)

                  const deployerProceedsBefore = await nftMarketplace.getProceeds(deployer.address)
                  const deployerBalanceBefore = await deployer.getBalance()
                  const txResponse = await nftMarketplace.withdrawProceeds()
                  const transactionReceipt = await txResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)
                  const deployerBalanceAfter = await deployer.getBalance()

                  assert(
                      deployerBalanceAfter.add(gasCost).toString() ==
                          deployerProceedsBefore.add(deployerBalanceBefore).toString()
                  )
              })
          })
      })
