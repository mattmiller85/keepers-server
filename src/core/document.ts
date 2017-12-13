export interface IDocument {
    id: string;
    text: string;
    tags: string;
    image_enc: string;
}

export interface IDocumentResult extends IDocument {
    score: number;
}
