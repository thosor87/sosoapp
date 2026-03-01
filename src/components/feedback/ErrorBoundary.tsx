import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#FFFBF5] p-4">
          <div className="w-full max-w-sm text-center">
            <span className="text-6xl block mb-4">{'\u26A0\uFE0F'}</span>
            <h1 className="text-2xl font-display font-bold text-warm-800 mb-2">
              Etwas ist schiefgelaufen
            </h1>
            <p className="text-warm-500 text-sm mb-6">
              Ein unerwarteter Fehler ist aufgetreten. Bitte lade die Seite neu.
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-md hover:shadow-lg h-10 px-5 text-sm cursor-pointer"
            >
              Seite neu laden
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
