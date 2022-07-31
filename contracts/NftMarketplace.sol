// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

error NftMarketplace__PriceMustBeAboveZero();
error NftMarketplace__NotApprovedForMarketplace();
error NftMarketplace__AlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplace__NotOwner();
error NftMarketplace__NotListed(address nftAddress, uint256 tokenId);
error NftMarketplace__PriceNotMet(address nftAddress, uint256 tokenId, uint256 price);
error NftMarketplace__NoProceeds();
error NftMarketplace__TransferFailed();

contract NftMarketplace {
    ///////////////////////
    // Type Declarations //
    ///////////////////////

    struct Listing {
        uint256 price;
        address seller;
    }

    ////////////
    // Events //
    ////////////

    event ItemListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemBought(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event ItemCancelled(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId
    );

    // NFT Contract Address => NFT Token ID => Listing
    mapping(address => mapping(uint256 => Listing)) private s_listings;

    // Seller address -> Amount earned
    mapping(address => uint256) private s_proceeds;

    ///////////////
    // Modifiers //
    ///////////////

    modifier notListed(
        address nftAddress,
        uint256 tokenId,
        address owner
    ) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price > 0) {
            revert NftMarketplace__AlreadyListed(nftAddress, tokenId);
        }
        _;
    }

    modifier isOwner(
        address nftAddress,
        uint256 tokenId,
        address spender
    ) {
        IERC721 nft = IERC721(nftAddress);
        address owner = nft.ownerOf(tokenId);
        if (spender != owner) {
            revert NftMarketplace__NotOwner();
        }
        _;
    }

    modifier isListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price <= 0) {
            revert NftMarketplace__NotListed(nftAddress, tokenId);
        }
        _;
    }

    ////////////////////
    // Main Functions //
    ////////////////////

    /*
     * @notice Method for listing your NFT on the marketplace
     * @param nftAddress: Contract address of the NFT
     * @param tokenId: The tokenId of the NFT
     * @param price: Sale price of the listed NFT
     * @dev Technically we could have the contract be the escrow for the NFTs but this way people can still hold their NFTs when listed, we just get the approval to spend the NFT.
     */
    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    ) external notListed(nftAddress, tokenId, msg.sender) isOwner(nftAddress, tokenId, msg.sender) {
        if (price <= 0) {
            revert NftMarketplace__PriceMustBeAboveZero();
        }

        /** 2 ways to list the item:
         * - Transfer the NFT to the contract.
         * - Give contract approval to sell the NFT (this is what we're gonna implement)
         */
        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NftMarketplace__NotApprovedForMarketplace();
        }

        s_listings[nftAddress][tokenId] = Listing(price, msg.sender);
        emit ItemListed(msg.sender, nftAddress, tokenId, price);
    }

    function buyItem(address nftAddress, uint256 tokenId)
        external
        payable
        isListed(nftAddress, tokenId)
    {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (msg.value < listing.price) {
            revert NftMarketplace__PriceNotMet(nftAddress, tokenId, listing.price);
        }

        /*
         * Pull over Push pattern: https://fravoll.github.io/solidity-patterns/pull_over_push.html
         * ❌ Sending the money to the user
         * ✅ Have them withdraw the money
         */
        s_proceeds[listing.seller] = s_proceeds[listing.seller] + msg.value;
        delete (s_listings[nftAddress][tokenId]);
        IERC721(nftAddress).safeTransferFrom(listing.seller, msg.sender, tokenId);
        emit ItemBought(msg.sender, nftAddress, tokenId, listing.price);
    }

    function cancelListing(address nftAddress, uint256 tokenId)
        external
        isOwner(nftAddress, tokenId, msg.sender)
        isListed(nftAddress, tokenId)
    {
        delete (s_listings[nftAddress][tokenId]);
        emit ItemCancelled(msg.sender, nftAddress, tokenId);
    }

    function updateListing(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    ) external isOwner(nftAddress, tokenId, msg.sender) isListed(nftAddress, tokenId) {
        s_listings[nftAddress][tokenId].price = newPrice;
        emit ItemListed(msg.sender, nftAddress, tokenId, newPrice);
    }

    function withdrawProceeds() external payable {
        uint256 proceeds = s_proceeds[msg.sender];
        if (proceeds <= 0) {
            revert NftMarketplace__NoProceeds();
        }

        s_proceeds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        if (!success) {
            revert NftMarketplace__TransferFailed();
        }
    }

    //////////////////////
    // Getter Functions //
    //////////////////////

    function getListing(address nftAddress, uint256 tokenId)
        external
        view
        returns (Listing memory)
    {
        return s_listings[nftAddress][tokenId];
    }

    function getProceeds(address seller) external view returns (uint256) {
        return s_proceeds[seller];
    }
}
