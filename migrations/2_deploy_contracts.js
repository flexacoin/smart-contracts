const FlexaTokenContract = artifacts.require('./FlexaToken.sol')

module.exports = function(deployer) {
  deployer.deploy(FlexaTokenContract).then(flexacoinTokenInst => {
    console.log('Instance', flexacoinTokenInst)
  })
}

/*
  gift brick guitar canyon subject female family fruit planet claw aim net
*/
