alter table public.orders
add column amount_paid bigint default 0,
add column payment_status text default 'unpaid';
-- unpaid, partial, paid

create table payments (
    id uuid default gen_random_uuid () primary key,
    order_id uuid references public.orders (id) on delete cascade not null,
    amount bigint not null,
    payment_method text, -- transfer, cash, etc
    evidence_url text, -- link ke foto bukti transfer (Supabase Storage)
    notes text, -- misal: "Pelunasan tahap 2"
    created_at timestamp with time zone default now()
);

-- Aktifkan RLS
alter table public.payments enable row level security;

-- Policy: Sales hanya bisa melihat payment dari order miliknya
create policy "Sales can view payments of their own orders" on public.payments for
select using (
        exists (
            select 1
            from public.orders
            where
                orders.id = payments.order_id
                and orders.sales_id = auth.uid ()
        )
    );

create or replace function update_order_payment_status()
returns trigger as $$
declare
    v_total_price bigint;
    v_total_paid bigint;
begin
    -- 1. Ambil total harga order
    select total_price into v_total_price from orders where id = new.order_id;
    
    -- 2. Hitung total semua pembayaran untuk order ini
    select sum(amount) into v_total_paid from payments where order_id = new.order_id;

    -- 3. Update header order
    update orders
    set 
        amount_paid = v_total_paid,
        payment_status = case 
            when v_total_paid >= v_total_price then 'paid'
            when v_total_paid > 0 then 'partial'
            else 'unpaid'
        end
    where id = new.order_id;

    return new;
end;
$$ language plpgsql;

create trigger tr_update_payment_status
after insert or update or delete on payments
for each row execute function update_order_payment_status();