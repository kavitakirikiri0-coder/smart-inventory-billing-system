package com.kavita.inventorybilling;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.List;
import java.util.Optional;

interface UserRepository extends JpaRepository<AppUser,Long> { Optional<AppUser> findByUsername(String username); boolean existsByUsername(String username); }
interface ProductRepository extends JpaRepository<Product,Long> {
    List<Product> findByNameContainingIgnoreCaseOrCategoryContainingIgnoreCase(String name,String category);
    List<Product> findByQuantityLessThanEqual(int quantity);
}
interface CustomerRepository extends JpaRepository<Customer,Long> {}
interface SupplierRepository extends JpaRepository<Supplier,Long> {}
interface BillRepository extends JpaRepository<Bill,Long> {
    @EntityGraph(attributePaths = "items")
    List<Bill> findAllByOrderByCreatedAtDesc();

    @Override
    @EntityGraph(attributePaths = "items")
    Optional<Bill> findById(Long id);
}
interface StockHistoryRepository extends JpaRepository<StockHistory,Long> {}
