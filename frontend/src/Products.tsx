import React from "react";

const Products = ({ product: { code, name, oldPrice, newPrice, err } }) => {
    return (
        <tr>
            <td>{code}</td>
            <td>{name}</td>
            <td>{oldPrice}</td>
            <td>{newPrice}</td>
            <td>{err ? err : "Nenhum"}</td>
        </tr>
    );
};

export default Products;
