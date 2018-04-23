export const EVMRevert = 'revert'

export const assertRevert = async promise => {
  try {
    await promise
    assert.fail('Expected revert not received')
  } catch (error) {
    const revertFound = error.message.search('revert') >= 0
    assert(revertFound, `Expected "revert", got ${error} instead`)
  }
}

export const assertThrow = async promise => {
  try {
    await promise
  } catch (error) {
    // TODO: Check jump destination to distinguish between a throw and an actual invalid jump.
    const invalidOpcode = error.message.search('invalid opcode') > -1

    // TODO: When we contract A calls contract B, and B throws, instead of an 'invalid jump', we get an 'out of gas'
    // error. How do we distinguish this from an actual out of gas event? The testrpc log actually show an "invalid
    // jump" event).
    const outOfGas = error.message.search('out of gas') > -1

    assert(invalidOpcode || outOfGas, `Expected throw, got ${error} instead`)

    return
  }

  assert(false, "Expected throw wasn't received")
}
