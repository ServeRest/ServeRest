import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export const options = {
  thresholds: {
    http_req_duration: ['p(95)<300'],
  },
};

export default function () {
  const rand = Math.random().toString(36).substring(7);

  const url = 'https://staging.serverest.dev/usuarios'

  // Post request

  const payload = JSON.stringify({
    nome: 'Fulano da Silva',
    email: `k6${rand}@qa.com.br`,
    password: 'teste',
    administrador: 'true'
  })

  const params = {
    headers: {
      'accept': 'application/json',
      'Content-Type': 'application/json',
      'accept-language': 'en-US,en;q=0.5',
      'accept-encoding': 'gzip, deflate',
    },
  };
  errorRate.add(1)
  const userCreate = http.post(url, payload, params);

  check(userCreate, {
    'User added correctly': (response) => response.json('message') === 'Cadastro realizado com sucesso',
  }) || errorRate.add(1);

  const userID = userCreate.json('_id');

  // Automatically added sleep
  sleep(1);

  // Get request

  const userSearch = http.get(`${url}/${userID}`);

  check(userSearch, {
    'User found': (response) => response.json('_id') === userID,
  }) || errorRate.add(1);

  // Automatically added sleep
  sleep(1);

  // Delete request

  const userDelete = http.del(`${url}/${userID}`);

  check(userDelete, {
    'User deleted correctly': (response) => response.json('message') === 'Registro excluído com sucesso',
  }) || errorRate.add(1);

  // Automatically added sleep
  sleep(1);
}
