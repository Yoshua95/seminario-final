import { Redirect } from "expo-router";

// Only mounted after the root guard validates the server user and importer role.
export default function Index() { return <Redirect href="/(tabs)" />; }
