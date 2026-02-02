export function ChatSimulator() {
	return (
		<div className="relative mx-auto w-full max-w-md">
			<div className="absolute inset-0 bg-linear-to-tr from-primary/20 to-transparent blur-2xl filter" />
			<div className="relative rounded-xl border border-white/10 bg-black p-6 font-sans shadow-xl backdrop-blur-md">
				<div className="mb-4 flex items-center justify-between border-white/10 border-b pb-4">
					<div className="flex items-center gap-3">
						<div className="size-10 rounded-full bg-linear-to-br from-purple-500 to-indigo-500" />
						<div>
							<div className="font-bold text-sm text-white">
								Project Alpha Group
							</div>
							<div className="text-white/50 text-xs">12 participants</div>
						</div>
					</div>
				</div>

				<div className="space-y-4 text-sm">
					<div className="flex gap-3">
						<div className="size-8 shrink-0 rounded-full bg-orange-500" />
						<div className="rounded-xl rounded-tl-none bg-white/10 p-3 text-white/90">
							Where is the updated invoice for the cement?
							<div className="mt-1 text-white/40 text-xs">10:42 AM</div>
						</div>
					</div>

					<div className="h-stack-reverse gap-3">
						<div className="size-8 shrink-0 rounded-full bg-blue-500" />
						<div className="rounded-xl rounded-tr-none bg-primary/20 p-3 text-white/90">
							I sent it yesterday. Check the files.
							<div className="mt-1 text-right text-white/40 text-xs">
								10:45 AM
							</div>
						</div>
					</div>

					<div className="flex gap-3">
						<div className="size-8 shrink-0 rounded-full bg-orange-500" />
						<div className="rounded-xl rounded-tl-none bg-white/10 p-3 text-white/90">
							I can't find it. Can you send it again?
							<div className="mt-1 text-white/40 text-xs">10:48 AM</div>
						</div>
					</div>

					<div className="flex justify-center py-2">
						<div className="rounded-full bg-white/5 px-3 py-1 text-white/40 text-xs">
							New message from Client...
						</div>
					</div>

					<div className="flex gap-3">
						<div className="size-8 shrink-0 rounded-full bg-green-500" />
						<div className="rounded-xl rounded-tl-none bg-white/10 p-3 text-white/90">
							<span className="font-bold text-destructive">@Team</span> Why is
							the site closed today??
							<div className="mt-1 text-white/40 text-xs">11:02 AM</div>
						</div>
					</div>
				</div>

				<div className="mt-6 flex items-center gap-2 rounded bg-white/20 p-2 px-4 blur-[1px]">
					<div className="text-white/30 text-xs">Type a message...</div>
				</div>

				{/* Overlay Error */}
				<div className="center absolute inset-0 flex rounded-xl bg-black/30">
					<div className="rotate-[-5deg] border-2 border-destructive bg-destructive/10 px-6 py-3 font-bold font-mono text-destructive text-xl uppercase tracking-widest backdrop-blur-sm">
						System Failure
					</div>
				</div>
			</div>
		</div>
	);
}
