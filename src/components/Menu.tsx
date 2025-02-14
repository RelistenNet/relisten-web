import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList
} from "@/components/ui/navigation-menu"
import Link from "next/link"

const Menu = () => (
  <NavigationMenu>
    <NavigationMenuList className="flex flex-col w-full [&>*]:px-8 [&>*]:py-1 [&>*]:w-full [&>*:not(:last-of-type)]:border-b">
      <NavigationMenuItem>
        <Link href="/" legacyBehavior passHref>
          <NavigationMenuLink>Home</NavigationMenuLink>
        </Link>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <Link href="/about" legacyBehavior passHref>
          <NavigationMenuLink>About</NavigationMenuLink>
        </Link>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <Link href="/today" legacyBehavior passHref>
          <NavigationMenuLink>Today</NavigationMenuLink>
        </Link>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <Link href="/live" legacyBehavior passHref>
          <NavigationMenuLink>Live</NavigationMenuLink>
        </Link>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <Link href="/sonos" legacyBehavior passHref>
          <NavigationMenuLink>Sonos</NavigationMenuLink>
        </Link>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <Link href="/ios" legacyBehavior passHref>
          <NavigationMenuLink>iOS</NavigationMenuLink>
        </Link>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <Link href="/chat" legacyBehavior passHref>
          <NavigationMenuLink>Chat</NavigationMenuLink>
        </Link>
      </NavigationMenuItem>
    </NavigationMenuList>
  </NavigationMenu>
)

export default Menu
