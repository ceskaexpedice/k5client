import { Metadata } from './metadata.model';

export class PeriodicalItem {
    title: string;
    subtitle: string;
    doctype: string;
    public: boolean;
    uuid: string;
    thumb: string;
    virtual = false;
    metadata: Metadata;
    dnnt = false;

    constructor() {
    }

    getPath(): string {
        if (this.doctype === 'periodicalvolume') {
            return 'periodical/' + this.uuid;
        } else {
            return 'view/' + this.uuid;
        }
    }

}
