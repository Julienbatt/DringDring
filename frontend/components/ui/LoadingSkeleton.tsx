export function LoadingSkeleton() {
    return (
        <div className="p-8 space-y-8 animate-pulse">
            <div className="space-y-3">
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
                ))}
            </div>

            <div className="space-y-4">
                <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
        </div>
    )
}
