import {MockApi, createMockBase, Interceptor} from '../src';

export const base = createMockBase();
export const api = new MockApi(base);
api.http.get('/', (req, res) => {
    const body = req.body ?? '';
    res.setStatus(200);
    res.setBody(body);
    res.send();
})

api.http.standard('/user/:id', (req, res) => {
    const body = {
        id: req.routeParams.id,
    }
})

const interceptor = new Interceptor([api]);
