type ActionType = 'open' | 'swap' | 'checkmark' | 'pin';

type IdsType = number[] | [number, number][];

export class Action {
    type: ActionType;
    ids: IdsType;

    constructor(type: ActionType, ids: IdsType) {
        this.type = type;

        if(type === 'swap'){
            this.ids = ids as [number, number][];
        } else {
            this.ids = ids as number[];
        }
    }
}
