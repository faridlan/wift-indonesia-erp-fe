
-- Add UPDATE and DELETE policies for customers
CREATE POLICY "Sales can update their own customers"
ON public.customers FOR UPDATE
USING (auth.uid() = sales_id)
WITH CHECK (auth.uid() = sales_id);

CREATE POLICY "Sales can delete their own customers"
ON public.customers FOR DELETE
USING (auth.uid() = sales_id);

-- Add UPDATE and DELETE policies for orders
CREATE POLICY "Sales can update own orders"
ON public.orders FOR UPDATE
USING (auth.uid() = sales_id)
WITH CHECK (auth.uid() = sales_id);

CREATE POLICY "Sales can delete own orders"
ON public.orders FOR DELETE
USING (auth.uid() = sales_id);

-- Add INSERT, UPDATE, DELETE policies for order_items
CREATE POLICY "Sales can insert items to their own orders"
ON public.order_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.sales_id = auth.uid()
));

CREATE POLICY "Sales can update items of their own orders"
ON public.order_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.sales_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.sales_id = auth.uid()
));

CREATE POLICY "Sales can delete items of their own orders"
ON public.order_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.sales_id = auth.uid()
));

-- Add INSERT, UPDATE, DELETE policies for payments
CREATE POLICY "Sales can insert payments for their own orders"
ON public.payments FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.sales_id = auth.uid()
));

CREATE POLICY "Sales can update payments of their own orders"
ON public.payments FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.sales_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.sales_id = auth.uid()
));

CREATE POLICY "Sales can delete payments of their own orders"
ON public.payments FOR DELETE
USING (EXISTS (
  SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.sales_id = auth.uid()
));

-- Add UPDATE policy for profiles
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
