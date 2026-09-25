"use client";

import { Menu } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

/** Menú de la cabecera (⋯). Ítems de 44 px, ícono a la izquierda, destructivo en rojo. */
export const DropdownMenu = Menu.Root;

export function DropdownMenuTrigger({ className, ...props }: Menu.Trigger.Props) {
  return <Menu.Trigger data-slot="dropdown-menu-trigger" className={className} {...props} />;
}

export function DropdownMenuContent({
  className,
  align = "end",
  sideOffset = 6,
  children,
  ...props
}: Menu.Popup.Props & { align?: Menu.Positioner.Props["align"]; sideOffset?: number }) {
  return (
    <Menu.Portal>
      <Menu.Positioner className="z-50 outline-none" align={align} sideOffset={sideOffset} collisionPadding={12}>
        <Menu.Popup
          data-slot="dropdown-menu"
          className={cn(
            "min-w-56 origin-(--transform-origin) overflow-hidden rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-raised outline-none",
            "transition-[opacity,transform] duration-200 ease-out data-starting-style:scale-95 data-starting-style:opacity-0",
            "data-ending-style:scale-95 data-ending-style:opacity-0 motion-reduce:transition-none",
            className,
          )}
          {...props}
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

const itemClass = cn(
  "flex min-h-tap w-full cursor-default items-center gap-3 px-3 text-base outline-none select-none",
  "data-highlighted:bg-accent data-disabled:opacity-50",
  "[&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
);

export function DropdownMenuItem({ className, variant = "default", ...props }: Menu.Item.Props & { variant?: "default" | "destructive" }) {
  return (
    <Menu.Item
      data-slot="dropdown-menu-item"
      className={cn(itemClass, variant === "destructive" && "text-destructive [&_svg]:text-destructive", className)}
      {...props}
    />
  );
}

export function DropdownMenuLinkItem({ className, ...props }: Menu.LinkItem.Props) {
  return <Menu.LinkItem data-slot="dropdown-menu-item" className={cn(itemClass, className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: Menu.Separator.Props) {
  return <Menu.Separator className={cn("my-1 h-px bg-border", className)} {...props} />;
}

export function DropdownMenuLabel({ className, ...props }: Menu.GroupLabel.Props) {
  return <Menu.GroupLabel className={cn("px-3 pt-2 pb-1 text-sm text-muted-foreground", className)} {...props} />;
}

export const DropdownMenuGroup = Menu.Group;
