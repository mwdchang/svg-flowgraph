export declare class BinaryHeap<T> {
    size: number;
    maxsize: number;
    data: Array<any>;
    scoreFn: (v: T) => number;
    constructor(maxsize: number, scoreFn: (v: T) => number);
    getParent(index: number): number;
    getLeftChild(index: number): number;
    getRightChild(index: number): number;
    isLeaf(index: number): boolean;
    swap(indexA: number, indexB: number): void;
    heapify(index: number): void;
    insert(e: T): void;
    pop(): T;
}
