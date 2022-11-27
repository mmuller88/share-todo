import { withAuthenticator, Text, Flex, View, Button, Badge } from '@aws-amplify/ui-react'
import { useEffect, useState } from 'react';
import { API, graphqlOperation } from 'aws-amplify'
import { createTodo, deleteTodo, updateTodo } from './graphql/mutations'
import { onCreateTodo, onUpdateTodo, onDeleteTodo } from './graphql/subscriptions';
import { listTodos } from './graphql/queries'

function App({ user, signOut }) {
  const [todos, setTodos] = useState([])

  useEffect(() => {
    const subscriptionFilter = { filter: { } }

    const fetchTodos = async () => {
      const result = await API.graphql(graphqlOperation(listTodos))
      setTodos(result.data.listTodos.items)
    }

    fetchTodos()
    const createSub = API.graphql(graphqlOperation(onCreateTodo, subscriptionFilter)).subscribe({
      next: ({ value }) => { setTodos((todos) => [...todos, value.data.onCreateTodo]) }
    })

    const updateSub = API.graphql(graphqlOperation(onUpdateTodo, subscriptionFilter)).subscribe({
      next: ({ value }) => {
        setTodos(todos => {
          const toUpdateIndex = todos.findIndex(item => item.id === value.data.onUpdateTodo.id)
          if (toUpdateIndex === - 1) { // If the todo doesn't exist, treat it like an "add"
            return [...todos, value.data.onUpdateTodo]
          }
          return [...todos.slice(0, toUpdateIndex), value.data.onUpdateTodo, ...todos.slice(toUpdateIndex + 1)]
        })
      }
    })

    const deleteSub = API.graphql(graphqlOperation(onDeleteTodo, subscriptionFilter)).subscribe({
      next: ({ value }) => {
        setTodos(todos => {
          const toDeleteIndex = todos.findIndex(item => item.id === value.data.onDeleteTodo.id)
          return [...todos.slice(0, toDeleteIndex), ...todos.slice(toDeleteIndex + 1)]
        })
      }
    })

    return () => {
      createSub.unsubscribe()
      updateSub.unsubscribe()
      deleteSub.unsubscribe()
    }
  }, [])

  return (
    <Flex direction={"column"} padding={8}>
      <Text>Logged in as <b>{user.username}</b> <Button variation='link' onClick={signOut}>Sign out</Button></Text>
      <Button onClick={() => {
        API.graphql(graphqlOperation(createTodo, {
          input: {
            content: window.prompt('content?'),
          }
        }))
      }}>Add todo</Button>
      {todos.map(todo => <Flex direction="column" border="1px solid black" padding={8} key={todo.id}>
        <Text fontWeight={'bold'}>{todo.content}</Text>
        <View>👨‍👩‍👧‍👦 {todo.owners.map(owner => <Badge margin={4}>{owner}</Badge>)}</View>
        <Flex>
          <Button onClick={async () => {
            API.graphql(graphqlOperation(updateTodo, {
              input: {
                id: todo.id,
                owners: [...todo.owners, window.prompt('Share with whom?')]
              }
            }))
          }}>Share ➕</Button>
          <Button onClick={async () => {
            API.graphql(graphqlOperation(deleteTodo, {
              input: { id: todo.id }
            }))
          }}>Delete</Button>
        </Flex>
      </Flex>)}
    </Flex>
  );
}

export default withAuthenticator(App);
