const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const Blog = require('../models/blog')

const initialBlogs = [
  {
    title: 'React patterns',
    author: 'Michael Chan',
    url: 'https://reactpatterns.com/',
    likes: 7
  },
  {
    title: 'Go To Statement Considered Harmful',
    author: 'Edsger W. Dijkstra',
    url: 'http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html',
    likes: 5
  }
]


const blogsInDb = async () => {
  const blogs = await Blog.find({})
  return blogs.map(blog => blog.toJSON())
}

beforeEach(async () => {
  await Blog.deleteMany({})
  await Blog.insertMany(initialBlogs)
})

test('a valid blog can be added', async () => {
  const newBlog = {
    title: 'Canonical string reduction',
    author: 'Edsger W. Dijkstra',
    url: 'http://www.cs.utexas.edu/~EWD/transcriptions/EWD08xx/EWD803.html',
    likes: 12
  }

  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  const response = await api.get('/api/blogs')
  
  expect(response.body).toHaveLength(initialBlogs.length + 1)

  const titles = response.body.map(r => r.title)
  expect(titles).toContain('Canonical string reduction')
})

test('si falta la propiedad likes, por defecto toma el valor de 0', async () => {
  const newBlog = {
    title: 'Blog sin likes definidos',
    author: 'Autor de prueba',
    url: 'https://example.com/blog-sin-likes'
  }

  const response = await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  expect(response.body.likes).toBe(0)
})

test('falta de título o url responde con 400 Bad Request', async () => {
  const newBlogWithoutTitle = {
    author: 'Edsger W. Dijkstra',
    url: 'http://www.cs.utexas.edu/~EWD/transcriptions/EWD08xx/EWD803.html',
    likes: 2
  }

  await api
    .post('/api/blogs')
    .send(newBlogWithoutTitle)
    .expect(400)

  const newBlogWithoutUrl = {
    title: 'Un título válido pero sin url',
    author: 'Edsger W. Dijkstra',
    likes: 2
  }

  await api
    .post('/api/blogs')
    .send(newBlogWithoutUrl)
    .expect(400)
})

test('el identificador único de las publicaciones se llama id', async () => {
  const response = await api.get('/api/blogs')

  expect(response.body[0].id).toBeDefined()
  expect(response.body[0]._id).toBeUndefined()
})

// Ejercicio 4.13
test('succeeds with status code 204 if id is valid', async () => {
  const blogsAtStart = await blogsInDb()
  const blogToDelete = blogsAtStart[0]

  await api
    .delete(`/api/blogs/${blogToDelete.id}`)
    .expect(204)

  const blogsAtEnd = await blogsInDb()
  expect(blogsAtEnd).toHaveLength(blogsAtStart.length - 1)

  const contents = blogsAtEnd.map(r => r.title)
  expect(contents).not.toContain(blogToDelete.title)
})

// Ejercicio 4.14
test('los likes de un blog se pueden actualizar', async () => {
  const blogsAtStart = await blogsInDb()
  const blogToUpdate = blogsAtStart[0]

  const blogToUpdateData = {
    ...blogToUpdate,
    likes: blogToUpdate.likes + 1
  }

  const response = await api
    .put(`/api/blogs/${blogToUpdate.id}`)
    .send(blogToUpdateData)
    .expect(200)
    .expect('Content-Type', /application\/json/)

  expect(response.body.likes).toBe(blogToUpdate.likes + 1)
})

afterAll(async () => {
  await mongoose.connection.close()
})