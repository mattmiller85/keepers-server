export interface IKeepersConfig {
    readonly readyToIndexQueueName: string;
    readonly rabbitUrl: string;
    readonly elasticSearchUrl: string;
    readonly documentIndexedExchangeName: string;
    readonly documentIndexedFailedExchangeName: string;
    readonly workerWorkingDirectory: string;
}

export class Config implements IKeepersConfig {
    public readyToIndexQueueName = "ready_to_index";
    public documentIndexedExchangeName = "document_indexed";
    public documentIndexedFailedExchangeName = "document_indexed_failed";
    public rabbitUrl = "amqp://localhost";
    public elasticSearchUrl = "localhost:9200";
    public workerWorkingDirectory = "C:\\tmp\\keepers-worker";
}
