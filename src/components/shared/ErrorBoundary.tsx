import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  hasError: boolean
  error: Error | null
}

interface Props {
  children: ReactNode
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 text-center">
            <h1 className="text-xl font-bold text-[#1A1D23] mb-2">Something went wrong</h1>
            <p className="text-[#4B5563] text-sm mb-6">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#4A90D9] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#357ABD] transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
