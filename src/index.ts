import { StatusCodes } from "./statusCodes";

class Mocker {
    private originalFetch: typeof fetch | null = null;
    private originalXMLHttpRequest: typeof XMLHttpRequest | null = null;
    private originalWebSocket: typeof WebSocket | null = null;
    private originalEventSource: typeof EventSource | null = null;

    private apis: Set<MockApi> = new Set();

    private mockFetch() {
        const glob = window;
        this.originalFetch = window.fetch;
        const mocked = (
            input: RequestInfo | URL,
            init?: RequestInit | undefined
        ): Promise<Response> => {
            for (let api of this.apis) {
                console.log(api.base);
                if (typeof input === "string" && api.matchBase(input)) {
                    console.log("matched MockApi", api.base);
                    const endpoint = input.slice(api.base.length);
                    return api.http.fetch(endpoint, init);
                }
            }

            // DELETE
            // return this.originalFetch!.call(glob, input, init);
            return Promise.resolve("original fetch");
        };
        glob.fetch = mocked;
    }

    private unmockFetch() {
        const glob = window;
        glob.fetch = this.originalFetch!;
    }

    private mockXMLHttpRequest() {}
    private unmockXMLHttpRequest() {}

    private mockHttp() {
        this.mockFetch();
        this.mockXMLHttpRequest();
    }
    private unmockHttp() {
        this.unmockFetch();
        this.unmockXMLHttpRequest();
    }

    // TODO: implement websocket
    private mockWebSocket() {
        const glob = window;
        this.originalWebSocket = glob.WebSocket;
        const mocked: typeof WebSocket = glob.WebSocket;

        glob.WebSocket = mocked;
    }

    private unmockWebSocket() {
        const glob = window;

        glob.WebSocket = this.originalWebSocket!;
    }

    // TODO: implement event source
    private mockEventSource() {
        const glob = window;
        this.originalEventSource = glob.EventSource;
        const mocked: typeof EventSource = glob.EventSource;

        glob.EventSource = mocked;
    }

    private unmockEventSource() {
        const glob = window;

        glob.EventSource = this.originalEventSource!;
    }

    public mockWebApis() {
        this.mockHttp();
        this.mockWebSocket();
        this.mockEventSource();
    }

    public unmockWebApis() {
        this.unmockHttp();
        this.unmockWebSocket();
        this.unmockEventSource();
    }

    public add(api: MockApi) {
        this.apis.add(api);
    }

    public delete(api: MockApi) {
        this.apis.delete(api);
    }
}

const mocker = new Mocker();

const enum HttpMethods {
    GET = "GET",
    POST = "POST",
    PATCH = "PATCH",
    PUT = "PUT",
    DELETE = "DELETE",
}

type HttpMockCbRequest = {
    method: HttpMethods;
    headers: HeadersInit;
    body: string | null;
};

type HttpMockCbResponse = {
    send(): void;
    setBody(body: BodyInit): void;
    setStatus(status: StatusCodes): void;
};

type HttpMockCb = (
    request: HttpMockCbRequest,
    response: HttpMockCbResponse
) => any;

type HttpMockEndpoints = {
    [endpoint: string]: {
        [method in HttpMethods]?: HttpMockCb;
    };
};

class HttpMock {
    base: string;
    endpoints: HttpMockEndpoints = {};
    constructor(base: string) {
        this.base = base;
    }

    public standard(
        endpoint: string,
        cb: HttpMockCb,
        options?: { method?: HttpMethods }
    ) {
        const method = options?.method ?? HttpMethods.GET;

        if (!this.endpoints[endpoint]) {
            this.endpoints[endpoint] = {};
        }

        this.endpoints[endpoint][method] = cb;
    }

    public get(endpoint: string, cb: HttpMockCb) {
        this.standard(endpoint, cb, { method: HttpMethods.GET });
    }

    public post(endpoint: string, cb: HttpMockCb) {
        this.standard(endpoint, cb, { method: HttpMethods.POST });
    }

    public put(endpoint: string, cb: HttpMockCb) {
        this.standard(endpoint, cb, { method: HttpMethods.PUT });
    }

    public patch(endpoint: string, cb: HttpMockCb) {
        this.standard(endpoint, cb, { method: HttpMethods.PATCH });
    }

    public delete(endpoint: string, cb: HttpMockCb) {
        this.standard(endpoint, cb, { method: HttpMethods.DELETE });
    }

    public fetch(
        input: string,
        init?: RequestInit | undefined
    ): Promise<Response> {
        let method: HttpMethods;

        if (init?.method) {
            method = init.method.toUpperCase() as HttpMethods;
        } else {
            method = HttpMethods.GET;
        }

        console.log("endpoints", this.endpoints);
        console.log("input", input);

        let body: null | any = null;

        if (init?.body) {
            body = JSON.parse(init.body as string);
        }

        const headers = new Headers(init?.headers);

        const cb = this.endpoints[input]?.[method];
        return new Promise((resolve, reject) => {
            if (cb == undefined) {
                reject(
                    new Response(null, {
                        headers: {},
                        status: 500,
                        statusText: "500",
                    })
                );
                return;
            }

            const requestObj: HttpMockCbRequest = {
                method,
                headers,
                body,
            };

            let responseStatus = 500;
            let responseBody: BodyInit = "";

            const responseObj: HttpMockCbResponse = {
                setBody(body: BodyInit) {
                    responseBody = body;
                },
                setStatus(status: StatusCodes) {
                    responseStatus = status;
                },
                send() {
                    const response = new Response(responseBody, {});

                    if (responseStatus < 400) {
                        console.log("resolve", responseStatus);
                        resolve(response);
                    } else {
                        console.log("reject", responseStatus);
                        reject(response);
                    }
                },
            };

            cb(requestObj, responseObj);
        });
    }
}

class WebsocketMock {
    base: string;
    constructor(base: string) {
        this.base = base;
    }
}

class EventSourceMock {
    base: string;
    constructor(base: string) {
        this.base = base;
    }
}

export class MockApi {
    base: string;

    http: HttpMock;
    ws: WebsocketMock;
    sse: EventSourceMock;

    constructor(base: string) {
        this.base = base;
        this.http = new HttpMock(base);
        this.ws = new WebsocketMock(base);
        this.sse = new EventSourceMock(base);
    }

    matchBase(base: string) {
        return base.startsWith(base);
    }
}

function createMockBaseInit() {
    const basesCount = 1;

    return function createMockBase(): string {
        let base = "///mock" + basesCount;
        return base;
    };
}

export const createMockBase = createMockBaseInit();

export class Interceptor {
    constructor(apis: MockApi[]) {
        apis.forEach((api) => {
            this.addApi(api);
        });
        this.enable();
    }

    enable() {
        mocker.mockWebApis();
    }

    disable() {
        mocker.unmockWebApis();
    }

    addApi(api: MockApi) {
        mocker.add(api);
    }

    deleteApi(api: MockApi) {
        mocker.delete(api);
    }
}
