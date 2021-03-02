export class Page {

    snippet: string;
    loaded = false;
    uuid: string;
    supplementUuid: string;
    type: string;
    number: string;
    index: number;
    thumb: string;
    display: number;
    selected = false;
    position = PagePosition.None;
    imageType = PageImageType.None;
    providedByDnnt = false;
    dnntFlag = false;
    originUrl: string;
    public: boolean;
    title: string;

    constructor() {
    }

    setTitle(title: string) {
        if (!title) {
            title = "";
        }
        title = String(title).trim();
        if (this.number.trim() != title) {
            this.title = title;
        }
    }

    showPageType(): boolean {
        return !!this.type && this.type != 'normalpage' && this.type != 'unknown';
    }

    public assignPageData(data) {
        if (!data) {
            return;
        }
        this.loaded = true;
        if (data['dnnt']) {
            this.dnntFlag = true;
        }
        if (data['providedByDnnt']) {
            this.providedByDnnt = true;
        }
        if (data['replicatedFrom'] && data['replicatedFrom'].length > 0) {
            this.originUrl = data['replicatedFrom'][0];
        }
        if (data['imageType'] == 'tiles') {
            this.imageType = PageImageType.TILES;
        } else if (data['imageType'] == 'image/jpeg') {
            this.imageType = PageImageType.JPEG;
        } else if (data['imageType'] == 'pdf') {
            this.imageType = PageImageType.PDF;
        }
    }

    public viewable() {
        return this.imageType === PageImageType.TILES || this.imageType === PageImageType.JPEG;
    }

    public clear() {
        this.loaded = false;
        this.imageType = PageImageType.None;
    }
}


export enum PagePosition {
    Single, None, Left, Right
}

export enum PageImageType {
    TILES, PDF, JPEG, None
}
