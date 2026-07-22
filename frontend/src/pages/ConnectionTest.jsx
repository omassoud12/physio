import { useCallback, useEffect, useState } from 'react'
import heroImg from '../assets/hero.png'
import { testBackendConnection } from '../services/api.js'
import '../App.css'

function ConnectionTest() {
  const [connection, setConnection] = useState({
    status: 'loading',
    message: 'Connecting to the backend...',
  })

  const checkConnection = useCallback(async () => {
    setConnection({
      status: 'loading',
      message: 'Connecting to the backend...',
    })

    try {
      const data = await testBackendConnection()
      setConnection({ status: 'success', message: data.message })
    } catch (error) {
      setConnection({ status: 'error', message: error.message })
    }
  }, [])

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  return (
    <main id="center">
      <img src={heroImg} className="clinic-image" alt="Physiotherapy clinic" />
      <div>
        <h1>Physiotherapy Clinic</h1>
        <p>Frontend, backend, and Supabase connection</p>
      </div>
      <div className={`connection connection--${connection.status}`}>
        <span className="connection__indicator" aria-hidden="true" />
        <span>{connection.message}</span>
      </div>
      <button
        type="button"
        className="connection-button"
        onClick={checkConnection}
        disabled={connection.status === 'loading'}
      >
        {connection.status === 'loading' ? 'Checking...' : 'Test connection'}
      </button>
    </main>
  )
}

export default ConnectionTest
