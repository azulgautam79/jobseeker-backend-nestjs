import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
    vus: 30,
    duration: '2h',
    
    thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01'],
    },
};


export default function () {
    http.get('http://localhost:7000/api/test/fast');
    sleep(1);
}
