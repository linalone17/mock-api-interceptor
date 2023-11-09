// interface

class Config {
    private baseArr: string[];

    constructor() {
        this.baseArr = [];
    }

    isMockBase(base: string) {
        return this.baseArr.includes(base);
    }

    createBase() {}
}

const config = new Config();

class Store {
    constructor() {}

}

const store = new Store();

export function mockFetch() {
    const glob = window;
    const origFetch = glob.fetch;
    //@ts-ignore
    glob.fetch = function (
        input: RequestInfo | URL,
        init?: RequestInit | undefined
    ): Promise<Response> {
        // if (input === config.mockBase) {
        //     return 1;
        // }

        return origFetch(input, init);
    };

    return () => {};
}

class Mocker {
    private originalFetch: typeof fetch | null = null;
    private originalXMLHttpRequest: typeof XMLHttpRequest | null = null;
    private apis: MockApi[] = [];



    private mockFetch() {
        const glob = window;
        this.originalFetch = window.fetch;
        const mocked = (
            input: RequestInfo | URL,
            init?: RequestInit | undefined
        ): Promise<Response> => {
            for (let api of this.apis) {
                
                if (typeof input === 'string' && api.matchBase(input)) {

                    break;
                }
            }

            return this.originalFetch!(input, init);
        };
        glob.fetch = mocked;
    }

    private mockXMLHttpRequest() {}

    private mockHttp() {
        this.mockFetch();
        this.mockHttp();
    }

    add(apis: MockApi[]) {}

    delete(apis: MockApi[]) {}
}

const mocker = new Mocker();

type HttpMethods = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const enum StatusCodes {
    "200Success" = 200,
}

type HttpMockCbRequest = {
    method: HttpMethods;
    headers: { [header: string]: string };
    body: string;
};

type HttpMockCbResponse = {
    send(): void;
    body: string;
    status: StatusCodes;
};

type HttpMockCb = (
    request: HttpMockCbRequest,
    response: HttpMockCbResponse
) => any;

type Action = () => void;
type HttpMockActions = {
    [endpoint: string]: {
        [method in HttpMethods]: string;
    };
};

class HttpMock {
    base: string;
    actions: {} = {};
    constructor(base: string) {
        this.base = base;
    }

    standard(endpoint: string, cb: HttpMockCb) {

    }

    get(endpoint: string, cb: HttpMockCb) {
        this.standard(endpoint, cb);
    }

    getEndpoints() {}

    request() {}
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
    http: HttpMock;
    ws: WebsocketMock;
    sse: EventSourceMock;
    base: string;

    constructor(base: string) {
        this.base = base;
        this.http = new HttpMock(base);
        this.ws = new WebsocketMock(base);
        this.sse = new EventSourceMock(base);
    }
    
    matchBase(base: string) {
        return this.base === base;
    }
}

const basesCount = 1;

export function createMockBase(): string {
    let base = "///mock" + basesCount;
    return base;
}

class Interceptor {
    apis: MockApi[];

    constructor(apis: MockApi[]) {
        this.apis = apis;
    }

    enable() {
        mocker.add(this.apis);
    }

    disable() {
        mocker.delete(this.apis);
    }
}

const base = createMockBase();
const api = new MockApi(base);
api.http.standard("/", (request, response) => {

});

const ic = new Interceptor([api]);
ic.enable;
