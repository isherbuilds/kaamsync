import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { authClient } from "~/lib/auth/client";

export default function SettingsProfilePage() {
	const { data: session } = authClient.useSession();
	const user = session?.user;

	if (!user) {
		return null;
	}

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">Profile</h3>
				<p className="text-sm text-muted-foreground">
					This is how others will see you on the site.
				</p>
			</div>
			<Separator />
			<div className="space-y-8">
				<div className="flex items-center gap-x-4">
					<Avatar className="h-20 w-20">
						<AvatarImage src={user.image ?? ""} alt={user.name} />
						<AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
					</Avatar>
					<div className="flex flex-col gap-1">
						<h4 className="text-sm font-medium leading-none">{user.name}</h4>
						<p className="text-sm text-muted-foreground">{user.email}</p>
					</div>
				</div>

				<div className="grid gap-2">
					<Label htmlFor="name">Name</Label>
					<Input id="name" defaultValue={user.name} disabled />
					<p className="text-[0.8rem] text-muted-foreground">
						Your name is managed through your connected accounts.
					</p>
				</div>

				<div className="grid gap-2">
					<Label htmlFor="email">Email</Label>
					<Input id="email" defaultValue={user.email} disabled />
					<p className="text-[0.8rem] text-muted-foreground">
						Your email address is managed through your connected accounts.
					</p>
				</div>
			</div>
		</div>
	);
}
