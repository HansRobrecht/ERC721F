const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FreeMint", function () {
    async function deployTokenFixture() {
        const Token = await ethers.getContractFactory("FreeMint");
        const [owner, addr1] = await ethers.getSigners();

        const hardhatToken = await Token.deploy();

        await hardhatToken.deployed();

        return { Token, hardhatToken, owner, addr1 };
    }

    describe("Deployment", function() {
        it("Supports ERC721 standards", async function() {
            const ERC721InterfaceId = 0x80ac58cd;
            const { hardhatToken } = await loadFixture(deployTokenFixture);

            expect(await hardhatToken.supportsInterface(ERC721InterfaceId)).to.be.true;
        });

        it("Supports ERC2981 standards", async function() {
            const ERC2981InterfaceId = 0x2a55205a;
            const { hardhatToken } = await loadFixture(deployTokenFixture);

            expect(await hardhatToken.supportsInterface(ERC2981InterfaceId)).to.be.true;
        });

        it("Has royalties at 5% by default", async function() {
            const { hardhatToken } = await loadFixture(deployTokenFixture);

            await hardhatToken.flipSaleState();
            await hardhatToken.mint(1);

            const { royaltyAmount } = await hardhatToken.royaltyInfo(0, 100);
            expect(royaltyAmount).to.be.equal(5);
        });
    });

    describe("sellToken", function() {
        let token;
        let ownerAddress;
        let otherAddress;

        beforeEach(async () => {
            const { hardhatToken, owner, addr1 } = await loadFixture(deployTokenFixture);
            token = hardhatToken;
            ownerAddress = owner;
            otherAddress = addr1;

            await token.flipSaleState();
            await token.mint(1);
        });

        it("Is only executable by the owner of the token", async function() {
            await expect(token.connect(otherAddress).sellToken(0, 500)).to.be.revertedWith("Not the tokenowner");
            await expect(token.sellToken(0, 500)).to.not.be.reverted;
        });

        it("Does not allow a sale with a price of 0", async function() {
            await expect(token.sellToken(0, 0)).to.be.revertedWith("token price must be larger than 0");
        });

        it("Creates an offering listing", async function() {
            expect(await token.offers(0)).to.be.equal(0);

            await token.sellToken(0, 500);

            expect((await token.offers(0))).to.be.equal(500);
        });
    });

    describe.skip("Max tokens minted in ONE TRX", function () {
        let totalMint = 1120; // Lower limit of tokens that'll increase in amount and be minted
        this.retries(10); // Amount of times the test will be attempted after failure

        beforeEach(function () {
            totalMint = totalMint + 1; // Increase total amount of tokens that are getting minted
        })

        // Test passes when `totalMint` is high enough to transcend the gas limit of a single transaction, this amount will then be displayed in the console 
        it("Should eventually fail indicating the total tokens minted", async function () {
            const { hardhatToken } = await loadFixture(deployTokenFixture);
            await hardhatToken.flipSaleState();
            await expect(hardhatToken.mint(totalMint)).to.be.reverted;
            console.log(totalMint);
        })
    });
});
