const FlexacoinTokenContract = artifacts.require('./FlexacoinToken.sol')

module.exports = function(deployer) {
  deployer.deploy(FlexacoinTokenContract).then(flexacoinTokenInst => {
    console.log('Instance', flexacoinTokenInst)
  })
}

/*
  gift brick guitar canyon subject female family fruit planet claw aim net
*/
