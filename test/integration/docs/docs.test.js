
describe('/ GET', () => {
  it('A página principal está retornando status code 200 - #202', async () => {
    await request.get('/').expect(200)
  })
})
