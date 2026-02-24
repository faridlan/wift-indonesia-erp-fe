-- 1. Tabel Pelanggan
create table customers (
    id uuid default gen_random_uuid () primary key,
    sales_id uuid references public.profiles (id),
    name text not null,
    phone text,
    address text,
    created_at timestamp with time zone default now()
);

-- 2. Tabel Order (Header)
create table orders (
    id uuid default gen_random_uuid () primary key,
    customer_id uuid references customers (id) on delete cascade,
    sales_id uuid references profiles (id) not null,
    order_number serial, -- Nomor urut otomatis
    total_price bigint default 0,
    status text default 'pending', -- pending, processing, shipped, completed
    created_at timestamp with time zone default now()
);

-- 3. Tabel Detail Order (Items)
create table order_items (
    id uuid default gen_random_uuid () primary key,
    order_id uuid references orders (id) on delete cascade,
    product_name text not null, -- Contoh: Kemeja Taktikal 5.11
    quantity int not null default 1,
    price_per_unit bigint not null,
    created_at timestamp with time zone default now()
);

alter table public.customers enable row level security;

alter table public.orders enable row level security;

alter table public.order_items enable row level security;

-- Aktifkan Row Level Security (RLS) untuk tabel orders
create policy "Sales can view own orders" on public.orders for
select using (auth.uid () = sales_id);

-- Membuat Policy agar Sales hanya bisa menambah order untuk dirinya sendiri
create policy "Sales can insert own orders" on public.orders for insert
with
    check (auth.uid () = sales_id);

-- Membuat Policy agar Sales hanya bisa melihat customernya sendiri
create policy "Sales can only see their own customers" on public.customers for
select using (auth.uid () = sales_id);

create policy "Sales can view itemms of their own orders" on public.order_items for
select using (
        exists (
            select 1
            from orders o
            where
                o.id = order_items.order_id
                and o.sales_id = auth.uid ()
        )
    );

-- Membuat Policy agar Sales hanya bisa menambah customer untuk dirinya sendiri
create policy "Sales can insert their own customers" on public.customers for insert
with
    check (auth.uid () = sales_id);

-- 1. Fungsi untuk menghitung total harga di tabel orders
create or replace function calculate_total_price()
returns trigger as $$
begin
update public.orders
set total_price = (
    select sum(quantity * price_per_unit)
    from public.order_items
    where order_id = new.order_id
)
where id = new.order_id;
return new;
end;
$$ language plpgsql;

-- 2. Trigger untuk memanggil fungsi calculate_total_price setelah insert atau update di order_items
create trigger update_total_price_after_insert
after insert on public.order_items
for each row execute procedure calculate_total_price();