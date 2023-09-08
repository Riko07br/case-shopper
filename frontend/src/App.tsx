import { ChangeEvent, useState } from "react";
import axios from "axios";
import Products from "./Products";

function App() {
    const [selectedFile, setSelectedFile] = useState<File>();
    const [validProducts, setValidProducts] = useState<boolean>(false);
    const [products, setProducts] = useState([]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFile(e.target.files[0]);
            setProducts([]);
            setValidProducts(false);
        }
    };

    const handleValidationClick = () => {
        if (!selectedFile) {
            return;
        }

        axios
            .postForm(import.meta.env.VITE_API_URL + "upload", {
                csv_file: selectedFile,
            })
            .then((response) => {
                setProducts(response.data);
                setValidProducts(true);
            })
            .catch((error) => {
                setProducts(error.response.data);
                setValidProducts(false);
            });
    };

    const handleUpdateClick = () => {
        axios
            .post(import.meta.env.VITE_API_URL + "update", products)
            .then((response) => {
                console.log(response);
                setProducts([]);
                setValidProducts(false);
            })
            .catch((error) => {
                console.error(error.response.data);
                setValidProducts(false);
            });
    };

    return (
        <>
            <header>
                <h1>Validador</h1>
            </header>
            <div>
                <div>
                    <p>
                        Validador de arquivos <strong>.CSV</strong> desenvolvido
                        para solução de um case
                    </p>
                    <p>
                        O frontend foi desenvolvido utilizando{" "}
                        <strong>React+Vite</strong> e o backend com{" "}
                        <strong>NestJs</strong>, que é um framework de NodeJs.
                    </p>
                </div>
                <input type="file" onChange={handleFileChange} />
                <div>
                    <button
                        onClick={handleValidationClick}
                        disabled={!selectedFile}>
                        Validar
                    </button>
                    <button
                        onClick={handleUpdateClick}
                        disabled={!(products?.length > 0) || !validProducts}>
                        Atualizar
                    </button>
                </div>
            </div>
            <div>
                <table>
                    <tr>
                        <th>ID do produto</th>
                        <th className="productName">Nome</th>
                        <th>Preço atual</th>
                        <th>Novo Preço</th>
                        <th className="productError">Erros</th>
                    </tr>
                    {products?.length > 0 ? (
                        products.map((p) => <Products product={p} />)
                    ) : (
                        <tr>
                            <td>---</td>
                            <td>---</td>
                            <td>---</td>
                            <td>---</td>
                            <td>---</td>
                        </tr>
                    )}
                </table>
            </div>
        </>
    );
}

export default App;
