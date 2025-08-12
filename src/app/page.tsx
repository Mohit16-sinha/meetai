"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";


/**
 * Client-side authentication UI component.
 *
 * Renders a session-aware sign-up / sign-in interface using the shared `authClient`.
 * - When a session exists, shows the current user's name and a Sign out button that calls `authClient.signOut()`.
 * - When no session exists, shows two forms:
 *   - Sign-up: collects name, email, and password and calls `authClient.signUp.email(...)`.
 *   - Sign-in: collects email and password and calls `authClient.signIn.email(...)`.
 *
 * Both auth calls use simple success/error callbacks that display a window alert. Local component state is used for form inputs.
 *
 * @returns The Home page React element.
 */
export default function Home() {
const { data: session } = authClient.useSession()


const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

const onSubmit =() => {
  authClient.signUp.email({
  email,
  name,
  password,
},{
  onError: () => { 
    window.alert("Something went wrong");
      
  },
  onSuccess: () => {
    window.alert("Success")
  }
});
}

const onLogin =() => {
  authClient.signIn.email({
  email,
  password,
},{
  onError: () => { 
    window.alert("Something went wrong");
      
  },
  onSuccess: () => {
    window.alert("Success")
  }
});
}

if (session) {
return(
  <div className="flex flex-col p-4 gap-y-4">
    <p>Logged in as {session.user.name}</p>
    <Button onClick={() => authClient.signOut()}>
      Sign out
    </Button>
  </div>
);
}

  return(
  <div className="flex flex-col gap-y-10 ">
   <div className="p-4 flex flex-col gap-y-4">
    <Input placeholder="name" value={name} onChange={(e) => setName (e.target.value)} />
    <Input placeholder="email" value={email} onChange={(e) => setEmail (e.target.value)} />
    <Input placeholder="password" value={password} onChange={(e) => setPassword (e.target.value)} />
    <Button onClick={onSubmit}>
      Create user
    </Button>
   </div>
   <div className="p-4 flex flex-col gap-y-4">
    
    <Input placeholder="email" value={email} onChange={(e) => setEmail (e.target.value)} />
    <Input placeholder="password" value={password} onChange={(e) => setPassword (e.target.value)} />
    <Button onClick={onLogin}>
      Login
    </Button>
   </div>
  </div>
  );
};
