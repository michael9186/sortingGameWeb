export class Card {
    id: number;
    value: string;
    selected: boolean;
    pinned: boolean;
    finalized: boolean;

    constructor(id: number, value: string, selected: boolean, pinned: boolean, finalized: boolean) {
        this.id = id;
        this.value = value;
        this.selected = selected;
        this.pinned = pinned;
        this.finalized = finalized;
    }
}
