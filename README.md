# E2E tests for Subtensor and Subtensor EVM

This repository stores a collection of e2e tests in JS that aim to test the most critical functionality of Subtensor and Subtensor EVM such as 

- Capability of block production
- Capability to include and execute transactions
- Subnet operations
- Emissions and staking rewards
- EVM transactions
- EVM smart contract deployment
- EVM gas cost
etc.

# Running all tests locally

1. Run a local subtensor node (using port 9944 for ws)

2. Execute tests

```bash
yarn
yarn run test
```

To run a particular test case, you can pass an argument with the name or part of
the name. For example:

```bash
yarn run test -- -g "Can set subnet parameter"
```
