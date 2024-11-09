#[starknet::interface]
pub trait ICounter<TContractState> {
    fn getValue(self: @TContractState) -> felt252;
    fn increment(ref self: TContractState) -> felt252;
    fn decrement(ref self: TContractState) -> felt252;
    fn add(ref self: TContractState, amount: felt252) -> felt252;
}

#[starknet::contract]
mod Counter {
    use core::starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        value: felt252
    }

    #[abi(embed_v0)]
    impl CounterImpl of super::ICounter<ContractState> {
        fn getValue(self: @ContractState) -> felt252 {
            self.value.read()
        }

        fn increment(ref self: ContractState) -> felt252 {
            self.value.write(self.value.read() + 1);
            self.value.read()
        }

        fn decrement(ref self: ContractState) -> felt252 {
            self.value.write(self.value.read() - 1);
            self.value.read()
        }

        fn add(ref self: ContractState, amount: felt252) -> felt252 {
            self.value.write(self.value.read() + amount);
            self.value.read()
        }
    }
}