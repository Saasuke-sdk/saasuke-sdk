function view(
    _target: any,
    _context: ClassMethodDecoratorContext
) {
    // View decorator just marks the method
}

function external(
    _target: any,
    _context: ClassMethodDecoratorContext
) {
    // External decorator just marks the method
}

class Counter {
    private value: number;

    constructor(initialValue: number = 0) {
        this.value = initialValue;
    }

    @view
    public getValue(): number {
        return this.value;
    }

    @external
    public increment(): number {
        this.value += 1;
        return this.value;
    }

    @external
    public decrement(): number {
        this.value -= 1;
        return this.value;
    }

    @external
    public add(amount: number): number {
        this.value += amount;
        return this.value;
    }
}

export default Counter;