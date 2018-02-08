import { Client } from 'elasticsearch';

import { IKeepersConfig } from './config';
import { IDocumentResult } from './core/document';

export interface ISearchResults {
    results: IDocumentResult[];
    tookMs: number;
}


export class Searcher {

    private client: Client;

    constructor(private config: IKeepersConfig) {
        this.client = new Client({host: config.elasticSearchUrl, log: 'trace'});
    }

    // public async indexSize(): Promise<number> {
    //     //return await this.client.get({ index: "documents"})
    // }

    public async updateTags(ids: string[], tags: string): Promise<{ ok: boolean, message: string}> {
        const pingGood = await this
        .client
        .ping({requestTimeout: 1000});
        const response = { ok: false, message: '' };
        ids.forEach(async (id) => {
            const resp = await this.client.update({ index: "documents", type: "document", id, body: {
                doc: { tags },
            }});
        });
        response.ok = true;
        response.message = 'Success';
        return Promise.resolve(response);
    }

    public async delete(ids: string[]): Promise<{ ok: boolean, message: string}> {
        const pingGood = await this
        .client
        .ping({requestTimeout: 1000});
        const response = { ok: false, message: '' };
        ids.forEach(async (id) => {
            const resp = await this.client.delete({ index: "documents", type: "document", id });
        });
        response.ok = true;
        response.message = 'Success';
        return Promise.resolve(response);
    }

    public async getKeeper(id: string): Promise<IDocumentResult> {
        const pingGood = await this
        .client
        .ping({requestTimeout: 1000});
        const response = await this
            .client
            .get({ index: "documents", type: "document", id });
        return Promise.resolve(this.documentResultFromHit(response, true));
    }

    public async search <T>(searchString: string): Promise<ISearchResults> {
        const pingGood = await this
            .client
            .ping({requestTimeout: 1000});
        const searchResults = await this
            .client
            .search({
                body: {
                    _source: {
                        excludes: ["image"],
                    },
                    query: {
                        multi_match: {
                            query:    searchString,
                            fields: ["text", "tags"],
                          },
                    },
                },
            });
        return Promise.resolve({
            tookMs: searchResults.took,
            results: searchResults.hits.hits.map((hit) => this.documentResultFromHit(hit)),
        });
    }

    private documentResultFromHit(hit: any, fillImage: boolean = false): IDocumentResult {
        return ({
            id: hit._id,
            text: (hit._source as any).text,
            tags: (hit._source as any).tags,
            image_enc: fillImage ? hit._source.image : "",
            score: hit._score,
            created: new Date((hit._source as any).created),
        });
    }
}
