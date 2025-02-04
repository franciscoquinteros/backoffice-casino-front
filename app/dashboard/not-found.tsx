import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
            <div className="text-center">
                <p className="text-base font-semibold text-red-600">404</p>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-100 sm:text-5xl">Página no encontrada</h1>
                <p className="mt-6 text-base leading-7 text-gray-600">Lo lamentamos, la página solicitada no existe</p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    <Link href="/dashboard" className="rounded-md bg-cyan-900 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cyan-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                        Volver al inicio
                    </Link>
                </div>
            </div>
        </div>
    )
} 