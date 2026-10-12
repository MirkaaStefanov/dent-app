# Services and categories

Apply `supabase/migrations/20261012093809_service_categories_and_optional_prices.sql` to the site's Supabase project before releasing this branch. The connected Supabase tool did not have access to project `ronkhlurdqedwjgebqtr`, so the migration has only been validated locally.

The migration preserves existing services and prices, creates category records from existing category names, links services through `category_id`, and defaults `clinic_settings.show_prices` to false. `services.category` remains for compatibility with older clients; current clients resolve names through the category relation. Prices may be null, including when global display is enabled.

In Admin → Services, use “Показвай цените в сайта” to enable public prices. Open “Категории” to add or rename a category. “Редактирай” opens the service form. An empty price means no published price. Service/category writes report database failures instead of pretending to save successfully.

The NHIF logo is the official asset from https://www.nhif.bg/assets/images/nhif_logo.png, saved locally in `public/images/nhif-logo.png`. The statement that the practice works with NHIF was supplied by the site owner.
